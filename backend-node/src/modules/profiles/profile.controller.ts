import type { Request, Response } from 'express';

import { sendSuccess } from '../../shared/http/response';
import { getAuthenticatedUser } from '../auth/auth.middleware';
import type { ProfileService } from './profile.service';
import type { ProfileUpdateBody } from './profile.validation';

export class ProfileController {
  public constructor(private readonly profileService: ProfileService) {}

  public readonly getMe = async (request: Request, response: Response): Promise<void> => {
    const currentUser = getAuthenticatedUser(request);
    const profile = await this.profileService.getMyProfile(currentUser.id);
    sendSuccess(response, { data: profile, message: 'Profile retrieved' });
  };

  public readonly updateMe = async (request: Request, response: Response): Promise<void> => {
    const currentUser = getAuthenticatedUser(request);
    const profile = await this.profileService.updateMyProfile(
      currentUser.id,
      request.validated.body as ProfileUpdateBody,
    );
    sendSuccess(response, { data: profile, message: 'Profile updated' });
  };
}
