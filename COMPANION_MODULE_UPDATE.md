# Companion Module Update: Ontime Custom Field Updates

## Overview
This document describes how to update the Bitfocus Companion module for Ontime to support sending custom field updates via HTTP POST requests. This allows external software (like video players, audio cue systems, etc.) to update custom field values that display in every row of the Operator and Cuesheet views.

## API Endpoint

### Endpoint Details
- **URL**: `/api/custom-field`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: Required (if password is set in Ontime settings)

### Full URL Format
```
http://HOST:PORT/api/custom-field
```

Where:
- `HOST`: The Ontime server hostname (default: `localhost`)
- `PORT`: The Ontime server port (default: `4001`)

### Authentication
If Ontime has a password set, include the token as a query parameter:
```
http://HOST:PORT/api/custom-field?token=YOUR_TOKEN
```

The token can be found in Ontime settings or obtained from the login flow.

## Request Body

### Global Custom Field Update (Recommended)
Updates a custom field value that displays in **every row** of that custom field column.

```json
{
  "fieldKey": "videoTimeRemaining",
  "value": "00:05:30"
}
```

### Per-Event Custom Field Update (Optional)
Updates a custom field value for a specific event.

```json
{
  "eventId": "abc123",
  "fieldKey": "videoTimeRemaining",
  "value": "00:05:30"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fieldKey` | string | Yes | The key/ID of the custom field (as defined in Ontime settings) |
| `value` | string | Yes | The value to set. Use empty string `""` to clear the field |
| `eventId` | string | No | If provided, updates per-event value. If omitted, updates global value |

## Response

### Success Response
- **Status Code**: `202 Accepted`
- **Body**:
```json
{
  "payload": "success"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "message": "Missing or invalid fieldKey. Expected a string."
}
```

```json
{
  "message": "Missing value. Use empty string \"\" to clear the field."
}
```

#### 401 Unauthorized
```
Unauthorized
```
(If authentication token is missing or invalid)

#### 500 Internal Server Error
```json
{
  "message": "Custom field 'fieldKey' not found. Please create the custom field first in settings."
}
```

## Dynamic Variables

The Companion module should support the following dynamic variables:

### Required Variables

1. **`$(ontime:host)`**
   - Description: Ontime server hostname
   - Default: `localhost`
   - Example: `localhost`, `192.168.1.100`

2. **`$(ontime:port)`**
   - Description: Ontime server port
   - Default: `4001`
   - Example: `4001`, `8080`

3. **`$(ontime:token)`**
   - Description: Authentication token (if password is set)
   - Default: Empty (no authentication)
   - Example: `abc123def456`

4. **`$(ontime:fieldKey)`**
   - Description: The custom field key/ID
   - Example: `videoTimeRemaining`, `audioCueTime`, `externalTimer`

5. **`$(ontime:value)`**
   - Description: The value to set for the custom field
   - Example: `00:05:30`, `120`, `Running`

### Optional Variables

6. **`$(ontime:eventId)`**
   - Description: Event ID for per-event updates (optional)
   - Example: `abc123`, `event-456`

## Companion Action Configuration

### Action Name
`Update Custom Field`

### Action Description
Updates a custom field value in Ontime. If `eventId` is provided, updates the value for that specific event. Otherwise, updates the global value that displays in every row.

### Action Fields

| Field Label | Variable | Type | Required | Default | Description |
|-------------|----------|------|----------|---------|-------------|
| Host | `host` | text | Yes | `localhost` | Ontime server hostname |
| Port | `port` | number | Yes | `4001` | Ontime server port |
| Token | `token` | text | No | (empty) | Authentication token (if password is set) |
| Field Key | `fieldKey` | text | Yes | (none) | Custom field key/ID |
| Value | `value` | text | Yes | (none) | Value to set (use empty string to clear) |
| Event ID | `eventId` | text | No | (empty) | Event ID for per-event update (leave empty for global) |

### Action Implementation

#### HTTP Request Configuration

**Method**: `POST`

**URL**: 
```
http://$(host):$(port)/api/custom-field$(token:?token=$(token))
```

Or construct it programmatically:
```javascript
let url = `http://${host}:${port}/api/custom-field`;
if (token) {
  url += `?token=${token}`;
}
```

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "fieldKey": "${fieldKey}",
  "value": "${value}",
  "eventId": "${eventId}"
}
```

Note: Only include `eventId` in the body if it's provided (not empty).

#### Example Implementation Pseudocode

```javascript
function updateCustomField(action) {
  const { host, port, token, fieldKey, value, eventId } = action.options;
  
  // Validate required fields
  if (!fieldKey || !value) {
    return { error: 'Field key and value are required' };
  }
  
  // Build URL
  let url = `http://${host}:${port}/api/custom-field`;
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  
  // Build request body
  const body = {
    fieldKey: fieldKey,
    value: value
  };
  
  // Only add eventId if provided
  if (eventId && eventId.trim() !== '') {
    body.eventId = eventId;
  }
  
  // Make HTTP request
  return http.post(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}
```

## Usage Examples

### Example 1: Update Global Video Time Remaining
**Use Case**: External video player sends remaining time

**Configuration**:
- Host: `localhost`
- Port: `4001`
- Token: (empty, if no password)
- Field Key: `videoTimeRemaining`
- Value: `00:05:30`
- Event ID: (empty)

**Result**: All rows in the `videoTimeRemaining` custom field column display `00:05:30`

### Example 2: Update Global Audio Cue Time
**Use Case**: Audio cue system sends remaining time

**Configuration**:
- Host: `192.168.1.100`
- Port: `4001`
- Token: `mySecretToken123`
- Field Key: `audioCueTime`
- Value: `00:02:15`
- Event ID: (empty)

**Result**: All rows in the `audioCueTime` custom field column display `00:02:15`

### Example 3: Clear a Global Field
**Use Case**: Clear the field when playback stops

**Configuration**:
- Field Key: `videoTimeRemaining`
- Value: `` (empty string)
- Event ID: (empty)

**Result**: All rows in the `videoTimeRemaining` custom field column are cleared

### Example 4: Update Per-Event Field
**Use Case**: Update a specific event's custom field

**Configuration**:
- Field Key: `status`
- Value: `Ready`
- Event ID: `abc123`

**Result**: Only the event with ID `abc123` has its `status` custom field updated

## Testing

### Test with cURL

#### Global Update (No Authentication)
```bash
curl -X POST http://localhost:4001/api/custom-field \
  -H "Content-Type: application/json" \
  -d '{"fieldKey":"testowy","value":"00:05:30"}'
```

#### Global Update (With Authentication)
```bash
curl -X POST "http://localhost:4001/api/custom-field?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fieldKey":"testowy","value":"00:05:30"}'
```

#### Per-Event Update
```bash
curl -X POST http://localhost:4001/api/custom-field \
  -H "Content-Type: application/json" \
  -d '{"eventId":"abc123","fieldKey":"testowy","value":"00:05:30"}'
```

#### Clear Field
```bash
curl -X POST http://localhost:4001/api/custom-field \
  -H "Content-Type: application/json" \
  -d '{"fieldKey":"testowy","value":""}'
```

## Error Handling

The Companion module should handle the following error scenarios:

1. **Network Errors**: Connection refused, timeout, etc.
   - Show user-friendly error message
   - Suggest checking host/port configuration

2. **401 Unauthorized**: 
   - Prompt user to check token/authentication settings
   - Provide link to Ontime settings

3. **400 Bad Request**:
   - Display the error message from the API
   - Highlight which field is invalid

4. **500 Internal Server Error**:
   - Display the error message (usually indicates custom field doesn't exist)
   - Suggest creating the custom field in Ontime settings first

## Integration Notes

1. **Custom Fields Must Exist**: Custom fields must be created in Ontime settings before they can be updated via the API.

2. **Global vs Per-Event**: 
   - Global updates (no `eventId`) display in every row
   - Per-event updates only affect the specified event
   - Global values take precedence over per-event values in the display

3. **Value Format**: 
   - Values are stored as strings
   - No specific format is enforced (can be time strings, numbers, text, etc.)
   - Empty string clears the field

4. **Real-time Updates**: 
   - Changes are broadcast immediately via WebSocket to all connected clients
   - No polling required

5. **Throttling**: 
   - The API internally throttles rapid updates (20ms minimum between updates)
   - This prevents performance issues with high-frequency updates

## Additional Resources

- Ontime API Documentation: Check the `/api` endpoint for other available actions
- Custom Fields Management: Create/manage custom fields in Ontime Settings → Manage → Custom Fields
- Authentication: Token can be found in Ontime Settings → General

## Version Compatibility

- **Minimum Ontime Version**: 4.0.0
- **API Version**: Current (as of this documentation)

## Support

For issues or questions:
1. Check Ontime server logs for detailed error messages
2. Verify custom field exists in Ontime settings
3. Test with cURL to isolate Companion-specific issues
4. Ensure authentication token is correct (if password is set)

