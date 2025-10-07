import { ACTION_STATUS_ENUMS } from '../constants/action';

/**
 * Enums
 */

export type ActionStatusEnum = (typeof ACTION_STATUS_ENUMS)[number];


/**
 * Actions; metadata
 */

export interface ActionTask {
  instructions: string;
  response: string | null;
  lastActionAt: Date | null;
}
