import type { PersonaObj } from './chat';

type OnlineStatusEnum = null | 'AWAY' | 'BUSY' | 'APPEAR_OFFLINE';
type PlusStatusEnum = 'PRO' | 'PLUS' | 'PERKS' | 'NORMAL';

export interface AppUser {
  id: string;
  username: string;
  displayName: string;

  moderator: boolean;
  activated: boolean;

  plusStatus: PlusStatusEnum;
  onlineStatus: OnlineStatusEnum;

  plus: {
    id: string;
    expireAt: string;
    cancelled: boolean;
    type: string;
  };

  theme: {
    id: string;
    name: string;
    backgroundPhotoUri: string;
  };

  profile: {
    id: string;
    description: string;
    pronouns: string;
    photoUri: string;
    backgroundPhotoUri: string;
    adult: boolean;
  };

  email: {
    id: string;
    address: string;
    verified: boolean;
  };

  phone: {
    id: string;
    number: string;
    verified: boolean;
  };

  personas: PersonaObj[];
}
