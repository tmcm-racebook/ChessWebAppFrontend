import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameManagementService, Game } from '../../services/game-management.service';
import { ChessBoardComponent } from './chess-board.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [ChessBoardComponent, CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit {
  orientation: 'white' | 'black' = 'white';
  gameId: string | null = null;
  game: Game | null = null;

  constructor(private route: ActivatedRoute, private gameService: GameManagementService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.gameId = params.get('id');
      if (this.gameId) {
        this.gameService.resumeGame(this.gameId).subscribe({
          next: (game) => {
            if (game && game['fenPosition']) {
              game['currentFen'] = game['fenPosition'];
            }
            this.game = game;
          },
          error: () => this.game = null
        });
      }
    });
  }
}
