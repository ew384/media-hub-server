import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthService {
  private authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

  async validateToken(token: string) {
    try {
      const response = await axios.get(`${this.authServiceUrl}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserById(userId: number) {
    try {
      const response = await axios.get(`${this.authServiceUrl}/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new UnauthorizedException('User not found');
    }
  }
}
