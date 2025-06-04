import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitted = false;
  loading = false;
  registerError: string | null = null;
  registerSuccess: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/)]]
    });
  }

  get f() { return this.registerForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.registerError = null;
    this.registerSuccess = null;
    if (this.registerForm.invalid) {
      return;
    }
    this.loading = true;
    const { username, email, password } = this.registerForm.value;
    this.authService.register(username, email, password).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.registerSuccess = 'Registration successful! You can now log in.';
      },
      error: (err: any) => {
        this.loading = false;
        this.registerError = err.error || 'Registration failed. Please try again.';
      }
    });
  }
}
