import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private authStateSubject = new BehaviorSubject<boolean>(this.hasToken());
  authState$: Observable<boolean>;

  constructor(private http: HttpClient) {
    this.authStateSubject = new BehaviorSubject<boolean>(this.hasToken());
    this.authState$ = this.authStateSubject.asObservable();
   }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>('/api/auth/login', { username, password }).pipe(
      tap((res: any) => {
        this.setToken(res.accessToken || res.token);
        this.setRefreshToken(res.refreshToken);
        this.authStateSubject.next(true);
      })
    );
  }

  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post<any>('/api/auth/register', { username, email, password });
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }
    return this.http.post<any>('/api/auth/refresh', { refreshToken }).pipe(
      tap((res: any) => this.setToken(res.accessToken || res.token)),
      map(res => res.accessToken || res.token)
    );
  }

  setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setRefreshToken(token: string) {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    // For real JWT, decode and check expiration
    return !!this.getToken();
  }

  private hasToken(): boolean {
    if (typeof window !== 'undefined' && localStorage) {
      return !!localStorage.getItem(this.TOKEN_KEY);
    }
    return false;
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.authStateSubject.next(false);
  }
}
