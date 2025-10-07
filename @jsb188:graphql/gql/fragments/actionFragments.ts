
export const actionFragment = `fragment actionFragment on Action {
  id
  referenceNumber
  actionFor
  status
  cursor

  tasks {
    instructions
    response
    at
  }

  scheduledAt
  lastActionAt
}`;
