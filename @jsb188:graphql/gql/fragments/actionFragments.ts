
export const actionFragment = `fragment actionFragment on Action {
  id
  referenceNumber
  status
  cursor

  tasks {
    instructions
    response
    lastActionAt
  }

  scheduledAt
  createdAt
  updatedAt
}`;
