import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GameManagementService } from '../../services/game-management.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-new-game',
  standalone: true,
  templateUrl: './new-game.component.html',
  styleUrl: './new-game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CommonModule]
})
export class NewGameComponent {
  form: FormGroup;
  loading$;
  error$;
  success = false;

  constructor(private fb: FormBuilder, private gameService: GameManagementService, private router: Router) {
    this.form = this.fb.group({
      opponent: ['', Validators.required],
      gameType: ['standard', Validators.required]
    });
    this.loading$ = this.gameService.loading$;
    this.error$ = this.gameService.error$;
  }

  submit() {
    if (this.form.invalid) return;
    this.success = false;
    this.gameService.createGame(this.form.value).subscribe({
      next: (game) => {
        this.success = true;
        this.form.reset({ gameType: 'standard' });
        this.router.navigate(['/game', game.id]);
      },
      error: () => {}
    });
  }
} 