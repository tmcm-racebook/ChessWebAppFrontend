import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameManagementService } from '../../services/game-management.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  showNewGameButton = false;
  isLoggedIn = false;
  hasExistingGames = false;
  resumableGames: any[] = [];
  loadingNewGame = false;
  gameType: 'computer' | 'online' | null = null;
  public error$;

  constructor(
    private gameService: GameManagementService,
    private router: Router,
    private authService: AuthService
  ) {
    this.error$ = this.gameService.error$;
  }

  ngOnInit() {
    this.authService.authState$.subscribe(isAuth => {
      this.isLoggedIn = isAuth;
      if (!isAuth) {
        this.showNewGameButton = false;
      }
    });
  }

  onPlay() {
    this.gameType = null;
    this.gameService.fetchGames(1, {}, { createdAt: 'desc' }).subscribe({
      next: (games) => {
        console.log('Fetched games:', games);
        // Only include games that are resumable (not completed, draw, abandoned, checkmate, stalemate, finished, etc.)
        const activeStatuses = ['in_progress', 'pending'];
        this.resumableGames = Array.isArray(games)
          ? games.filter(g => g && g.status && activeStatuses.includes(g.status.toLowerCase()))
          : [];
        this.hasExistingGames = this.resumableGames.length > 0;
        this.showNewGameButton = true;
      },
      error: (err) => {
        this.hasExistingGames = false;
        this.resumableGames = [];
        this.showNewGameButton = true;
        console.error('Failed to fetch games:', err);
      }
    });
  }

  selectGameType(type: 'computer' | 'online') {
    this.gameType = type;
  }

  onNewGame() {
    if (this.loadingNewGame || !this.gameType) return;
    this.loadingNewGame = true;
    console.log('Creating new game:', this.gameType);
    this.gameService.createGame({ gameType: this.gameType, opponentUsername: null }).subscribe({
      next: (game) => {
        this.loadingNewGame = false;
        console.log('Game created:', game);
        if (game && game.id) {
          this.router.navigate(['/game', game.id]);
        } else {
          // fallback: reload games or show error
          this.showNewGameButton = false;
        }
      },
      error: (err) => {
        this.loadingNewGame = false;
        this.showNewGameButton = false;
        // Optionally show an error message
        console.error('Failed to create game:', err);
      }
    });
  }

  onResumeGame(gameId: string) {
    this.router.navigate(['/game', gameId]);
  }

  onLogin() {
    this.router.navigate(['/login']);
  }
}
