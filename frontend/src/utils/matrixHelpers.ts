/**
 * Matrix Helper Functions
 * Utility functions for Matrix client operations
 */
import * as matrix from 'matrix-js-sdk'

export function getOtherUserInRoom(client: matrix.MatrixClient, room: any) {
  try {
    const members = room.getMembers()
    const otherMember = members.find((m: any) => m.userId !== client.getUserId())
    return otherMember || null
  } catch (error) {
    console.error('Error getting other user in room:', error)
    return null
  }
}
