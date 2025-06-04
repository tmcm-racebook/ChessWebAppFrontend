import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { GameManagementService, Game } from '../../services/game-management.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-list',
  standalone: true,
  templateUrl: './game-list.component.html',
  styleUrl: './game-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class GameListComponent implements OnInit {
  games: Game[] = [];
  loading$;
  error$;
  page = 1;
  totalPages = 1; // Placeholder, update if backend provides total
  sortOption = 'date';
  statusFilter = '';

  constructor(private gameService: GameManagementService, private router: Router) {
    this.loading$ = this.gameService.loading$;
    this.error$ = this.gameService.error$;
  }

  ngOnInit() {
    this.fetchGames();
  }

  fetchGames() {
    const filters: any = {};
    if (this.statusFilter) filters.status = this.statusFilter;
    const sortOptions: any = {};
    if (this.sortOption) sortOptions.date = this.sortOption;
    this.gameService.fetchGames(this.page, filters, sortOptions).subscribe({
      next: (result) => {
        this.games = Array.isArray(result) ? result : [];
      },
      error: () => {}
    });
  }

  onPrevPage() {
    if (this.page > 1) {
      this.page--;
      this.fetchGames();
    }
  }

  onNextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetchGames();
    }
  }

  onSortChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.sortOption = value;
    this.page = 1;
    this.fetchGames();
  }

  onStatusFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter = value;
    this.page = 1;
    this.fetchGames();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'finished': return 'status-finished';
      case 'draw': return 'status-draw';
      default: return 'status-other';
    }
  }

  resumeGame(game: Game) {
    this.gameService.resumeGame(game.id).subscribe({
      next: (loadedGame) => {
        this.router.navigate(['/game', loadedGame.id]);
      },
      error: () => {}
    });
  }
} 