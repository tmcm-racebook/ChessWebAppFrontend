import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

export interface Game {
  id: string;
  status: string;
  lastMoveTimestamp: string;
  playerWhite: string;
  playerBlack: string;
  currentTurn: string;
  gameType?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class GameManagementService {
  private apiUrl = '/api/games';
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Fetch paginated games with metadata
   */
  fetchGames(page: number = 1, filters: any = {}, sortOptions: any = {}): Observable<Game[]> {
    this.loading$.next(true);
    this.error$.next(null);
    let params = new HttpParams().set('page', page.toString());
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key]);
      }
    });
    Object.keys(sortOptions).forEach(key => {
      if (sortOptions[key]) {
        params = params.set('sort_' + key, sortOptions[key]);
      }
    });
    return this.http.get<Game[]>('/api/games/user', { params }).pipe(
      catchError(err => {
        this.error$.next('Failed to fetch games');
        return throwError(() => err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }

  createGame(gameOptions: any): Observable<Game> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<Game>(this.apiUrl, gameOptions).pipe(
      catchError(err => {
        this.error$.next('Failed to create game');
        return throwError(() => err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }

  resumeGame(gameId: string): Observable<Game> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<Game>(`${this.apiUrl}/${gameId}/resume`, {}).pipe(
      catchError(err => {
        this.error$.next('Failed to load game');
        return throwError(() => err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }

  deleteGame(gameId: string): Observable<any> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.delete(`${this.apiUrl}/${gameId}`).pipe(
      catchError(err => {
        this.error$.next('Failed to delete game');
        return throwError(() => err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }

  /**
   * Fetch the current state of a game by ID
   */
  fetchGameState(gameId: string): Observable<Game> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.get<Game>(`${this.apiUrl}/${gameId}/state`).pipe(
      catchError(err => {
        this.error$.next('Failed to fetch game state');
        return throwError(() => err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }

  /**
   * Submit a move to the backend for a given game
   */
  submitMove(gameId: string, move: { source: string, target: string, promotion?: string }): Observable<Game> {
    this.loading$.next(true);
    this.error$.next(null);
    return this.http.post<Game>(`${this.apiUrl}/${gameId}/move`, move).pipe(
      catchError(err => {
        this.error$.next('Failed to submit move');
        return throwError(() => err);
      }),
      finalize(() => this.loading$.next(false))
    );
  }

  /**
   * Poll for the latest game state (for real-time updates)
   */
  pollGameState(gameId: string, intervalMs: number = 2000): Observable<Game> {
    return new Observable<Game>(observer => {
      let stopped = false;
      const poll = () => {
        if (stopped) return;
        this.fetchGameState(gameId).subscribe({
          next: state => {
            observer.next(state);
            setTimeout(poll, intervalMs);
          },
          error: err => {
            observer.error(err);
            setTimeout(poll, intervalMs);
          }
        });
      };
      poll();
      return () => { stopped = true; };
    });
  }

  /**
   * Fetch move history for a game
   */
  getMoveHistory(gameId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/games/${gameId}/moves`);
  }
} 