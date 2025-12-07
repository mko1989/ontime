/**
 * API Router
 * User to handle all requests which affect runtime
 * It is a mirror implementation of OSC and Websocket Adapters
 *
 */

import { ErrorResponse, LogOrigin } from 'ontime-types';

import express, { type Request, type Response } from 'express';

import { logger } from '../classes/Logger.js';
import { integrationPayloadFromPath } from '../adapters/utils/parse.js';

import { dispatchFromAdapter } from './integration.controller.js';
import { getErrorMessage } from 'ontime-utils';
import { isEmptyObject } from '../utils/parserUtils.js';
import { updateCustomFieldValue, updateGlobalCustomFieldValue } from './integration.controller.js';

export const integrationRouter = express.Router();

const helloMessage = 'You have reached Ontime API server';

integrationRouter.get('/', (_req: Request, res: Response<{ message: string }>) => {
  res.status(200).json({ message: helloMessage });
});

/**
 * POST /api/integration/custom-field
 * Updates a custom field value
 * 
 * For global values (displayed in all rows):
 * Body: { fieldKey: string, value: string }
 * 
 * For per-event values:
 * Body: { eventId: string, fieldKey: string, value: string }
 * 
 * Examples:
 * POST /api/integration/custom-field
 * { "fieldKey": "videoTimeRemaining", "value": "00:05:30" }  // Global value
 * 
 * POST /api/integration/custom-field
 * { "eventId": "abc123", "fieldKey": "videoTimeRemaining", "value": "00:05:30" }  // Per-event value
 */
integrationRouter.post('/custom-field', (req: Request, res: Response<ErrorResponse | { payload: unknown }>) => {
  try {
    logger.info(LogOrigin.Rx, `POST /custom-field received: ${JSON.stringify(req.body)}`);
    
    // Check if body exists and is valid JSON
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ message: 'Invalid request body. Expected JSON object.' });
      return;
    }

    const { eventId, fieldKey, value } = req.body;

    if (!fieldKey || typeof fieldKey !== 'string') {
      res.status(400).json({ message: 'Missing or invalid fieldKey. Expected a string.' });
      return;
    }

    // Allow empty strings, but not undefined/null
    if (value === undefined || value === null) {
      res.status(400).json({ message: 'Missing value. Use empty string "" to clear the field.' });
      return;
    }

    // If eventId is provided, update per-event value; otherwise update global value
    if (eventId && typeof eventId === 'string') {
      const reply = updateCustomFieldValue(eventId, fieldKey, value);
      res.status(202).json(reply);
    } else {
      const reply = updateGlobalCustomFieldValue(fieldKey, value);
      res.status(202).json(reply);
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(LogOrigin.Rx, `HTTP IN: ${errorMessage}`);
    res.status(500).send({ message: errorMessage });
  }
});

/**
 * All calls are sent to the dispatcher
 * This handles GET requests for the integration API
 */
integrationRouter.get('/*splat', (req: Request, res: Response<ErrorResponse | { payload: unknown }>) => {
  let action = req.path.substring(1);
  if (!action) {
    res.status(400).json({ message: 'No action found' });
    return;
  }

  try {
    const actionArray = action.split('/');
    const query = isEmptyObject(req.query) ? undefined : (req.query as object);
    let payload: unknown = {};
    if (actionArray.length > 1) {
      // @ts-expect-error -- we decide to give up on typing here
      action = actionArray.shift();
      payload = integrationPayloadFromPath(actionArray, query);
    } else {
      payload = query;
    }
    const reply = dispatchFromAdapter(action, payload, 'http');
    res.status(202).json(reply);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(LogOrigin.Rx, `HTTP IN: ${errorMessage}`);
    res.status(500).send({ message: errorMessage });
  }
});

