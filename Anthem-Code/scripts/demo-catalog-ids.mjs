/** Fixed UUID helpers for demo catalog (users 0–19). */

export const catalogUid = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
};

export const catalogProjectId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0002-0000000000${hex}`;
};

export const catalogStudioId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0001-0000000000${hex}`;
};

export const catalogJobId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0003-0000000000${hex}`;
};

export const catalogAdId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0004-0000000000${hex}`;
};

export const commentId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0007-${hex}`;
};

export const collectionId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0008-1${hex.slice(1)}`;
};

export const collectionItemId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0008-2${hex.slice(1)}`;
};

export const inspireBoardId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0009-${hex}`;
};

export const inspireItemId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-000f-${hex}`;
};

export const giftTxId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-000a-${hex}`;
};

export const jobAppId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-000b-${hex}`;
};

export const hireReqId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0006-${hex}`;
};

export const collabReqId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0005-${hex}`;
};

export const notificationId = (n) => {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-0000-000e-${hex}`;
};

export const DEMO_EMAIL_SUFFIX = "@demo.pixel100.com";

export const demoEmail = (username) => `${username}${DEMO_EMAIL_SUFFIX}`;
