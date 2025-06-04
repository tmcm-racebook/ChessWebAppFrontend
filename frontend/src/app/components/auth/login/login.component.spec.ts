import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';
import { of, throwError } from 'rxjs';

class MockAuthService {
  login(username: string, password: string) {
    if (username === 'valid' && password === 'Password1') {
      return of({ token: 'fake-jwt-token' });
    }
    return throwError(() => new Error('Invalid credentials'));
  }
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useClass: MockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate the form if fields are empty', () => {
    component.loginForm.setValue({ username: '', password: '' });
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('should show validation errors for invalid input', () => {
    component.loginForm.setValue({ username: 'ab', password: '123' });
    component.submitted = true;
    fixture.detectChanges();
    expect(component.f['username'].errors && component.f['username'].errors['minlength']).toBeTruthy();
    expect(component.f['password'].errors && component.f['password'].errors['pattern']).toBeTruthy();
  });

  it('should call AuthService.login and handle success', fakeAsync(() => {
    spyOn(authService, 'login').and.callThrough();
    component.loginForm.setValue({ username: 'valid', password: 'Password1' });
    component.onSubmit();
    tick();
    expect(authService.login).toHaveBeenCalledWith('valid', 'Password1');
    expect(component.loading).toBeFalse();
    expect(component.loginError).toBeNull();
  }));

  it('should handle login error', fakeAsync(() => {
    spyOn(authService, 'login').and.callThrough();
    component.loginForm.setValue({ username: 'invalid', password: 'wrong' });
    component.onSubmit();
    tick();
    expect(authService.login).toHaveBeenCalledWith('invalid', 'wrong');
    expect(component.loading).toBeFalse();
    expect(component.loginError).toBe('Invalid username or password');
  }));
});
