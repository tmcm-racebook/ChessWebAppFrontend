import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  isAuthenticated = false;

  constructor(private authService: AuthService) {
    this.authService.authState$.subscribe((state: boolean) => {
      this.isAuthenticated = state;
    });
  }

  logout() {
    this.authService.logout();
  }
}
