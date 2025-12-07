import { EntryCustomFields, runtimeStorePlaceholder } from 'ontime-types';

import { throttle } from '../../utils/throttle.js';
import type { StoreGetter, PublishFn } from '../../stores/EventStore.js';
import { eventStore } from '../../stores/EventStore.js';

/**
 * Create a throttled version of the set function
 */
let throttledSet: PublishFn = () => undefined;
let storeGet: StoreGetter = (_key: string) => undefined;

/**
 * Initialises the service with store functions
 */
export function init(storeSetter: PublishFn, storeGetter: StoreGetter) {
  throttledSet = throttle(storeSetter, 20);
  storeGet = storeGetter;
}

/**
 * Exposes function to reset the internal state
 */
export function clear() {
  throttledSet('globalCustomFields', { ...runtimeStorePlaceholder.globalCustomFields });
}

/**
 * Exposes the internal state of the global custom fields service
 */
export function getState(): EntryCustomFields {
  // we know this exists at runtime
  return (storeGet('globalCustomFields') as EntryCustomFields) ?? {};
}

/**
 * Updates a single global custom field value
 * @param fieldKey - The key of the custom field to update
 * @param value - The new value (or null/undefined to clear)
 */
export function updateField(fieldKey: string, value: string | null | undefined): EntryCustomFields {
  const currentState = getState();
  const newState: EntryCustomFields = { ...currentState };

  if (value === null || value === undefined || value === '') {
    // Remove the field if value is empty/null
    delete newState[fieldKey];
  } else {
    // Update the field value
    newState[fieldKey] = value;
  }

  throttledSet('globalCustomFields', newState);
  return newState;
}

/**
 * Updates multiple global custom field values at once
 * @param updates - Object with field keys and values
 */
export function updateFields(updates: Partial<EntryCustomFields>): EntryCustomFields {
  const currentState = getState();
  const newState: EntryCustomFields = { ...currentState };

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      delete newState[key];
    } else {
      newState[key] = value;
    }
  });

  throttledSet('globalCustomFields', newState);
  return newState;
}

