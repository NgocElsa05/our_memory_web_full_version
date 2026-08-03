/**
 * Thư do phiên hiện tại gửi — so sánh sender_id = members.id (uuid).
 */
export function isLetterFromMe(letter, sessionUserId) {
  if (!sessionUserId) return false;
  if (letter.sender_id) return letter.sender_id === sessionUserId;
  return false;
}

/** Thư gửi cho phiên hiện tại */
export function isLetterReceivedBySession(letter, sessionUserId) {
  if (!sessionUserId) return false;
  if (letter.receiver_id) return letter.receiver_id === sessionUserId;
  return !isLetterFromMe(letter, sessionUserId);
}
