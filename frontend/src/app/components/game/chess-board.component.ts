import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { Chess, Square, Move } from 'chess.js';
import { Game } from '../../services/game-management.service';
import { GameManagementService } from '../../services/game-management.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const PIECE_UNICODE: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

@Component({
  selector: 'app-chess-board',
  standalone: true,
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.scss',
  imports: [CommonModule, ReactiveFormsModule]
})
export class ChessBoardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() game: Game | null = null;

  board: string[][] = [];
  selectedSquare: { row: number, col: number } | null = null;
  validMoves: { row: number, col: number }[] = [];
  chess = new Chess();

  // Pawn promotion state
  promotionPending: { from: Square, to: Square } | null = null;
  promotionColor: 'w' | 'b' | null = null;

  // Error feedback
  errorMessage: string | null = null;
  errorTimeout: any = null;

  // Game status
  gameStatus: string = '';
  moveHistory: string[] = [];
  gameOver: boolean = false;

  loading: boolean = false;

  fullMoveHistory: any[] = [];

  constructor(private gameService: GameManagementService) {}

  ngOnInit() {
    this.generateBoard();
    this.updateGameStatus();
    this.updateMoveHistory();
    this.updateGameOver();
    this.fetchMoveHistory();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['game'] && this.game) {
      const fen = this.game['currentFen'] || this.game['fenPosition'] || START_FEN;
      this.chess.load(fen);
      this.generateBoard();
      this.updateGameStatus();
      this.updateMoveHistory();
      this.updateGameOver();
      this.fetchMoveHistory();
    }
  }

  ngOnDestroy() {}

  generateBoard() {
    this.board = this.fenToBoard(this.chess.fen());
    if (this.orientation === 'black') {
      this.board.reverse();
    }
    this.selectedSquare = null;
    this.validMoves = [];
    this.promotionPending = null;
    this.promotionColor = null;
    this.clearError();
    this.updateGameStatus();
    this.updateMoveHistory();
    this.updateGameOver();
  }

  fenToBoard(fen: string): string[][] {
    const rows = fen.split(' ')[0].split('/');
    return rows.map(row => {
      const squares: string[] = [];
      for (const char of row) {
        if (/[1-8]/.test(char)) {
          for (let i = 0; i < +char; i++) squares.push('');
        } else {
          squares.push(char);
        }
      }
      return squares;
    });
  }

  getSquareColor(row: number, col: number): string {
    return (row + col) % 2 === 0 ? 'light' : 'dark';
  }

  getPieceSymbol(piece: string): string {
    if (!piece) return '';
    // Accept both single-letter and FEN codes
    const code = piece.length === 1 ? piece : piece.charAt(0);
    return PIECE_UNICODE[code] || '';
  }

  onSquareClick(row: number, col: number) {
    console.log('onSquareClick:', { game: this.game });
    if (this.promotionPending || this.gameOver) return;
    const square = this.rcToAlgebraic(row, col) as Square;
    const piece = this.board[row][col];
    if (this.selectedSquare) {
      const from = this.rcToAlgebraic(this.selectedSquare.row, this.selectedSquare.col) as Square;
      const to = square;
      if (from !== to && this.isValidMove(from, to)) {
        const moveObj = this.chess.moves({ square: from, verbose: true }).find((m: Move) => m.to === to);
        if (moveObj && moveObj.flags.includes('p')) {
          this.promotionPending = { from, to };
          this.promotionColor = this.chess.turn();
          return;
        }
        // Submit move to backend
        if (this.game && this.game.id) {
          console.log(`Submitting move: ${from}${to}`);
          this.loading = true;
          this.gameService.submitMove(this.game.id, { source: from, target: to })
            .subscribe({
              next: (game) => {
                if (game && game['fenPosition']) {
                  game['currentFen'] = game['fenPosition'];
                }
                this.game = game;
                if (game && game['currentFen']) {
                  this.chess.load(game['currentFen']);
                  this.generateBoard();
                  this.updateGameStatus();
                  this.updateMoveHistory();
                  this.updateGameOver();
                }
                this.selectedSquare = null;
                this.updateGameOver();
                this.fetchMoveHistory();
              },
              error: (err) => {
                this.errorMessage = 'Failed to submit move';
              }
            });
        }
        return;
      }
      this.showError('Illegal move');
      this.selectedSquare = null;
      this.validMoves = [];
    } else if (piece && this.isPieceTurn(piece)) {
      this.selectedSquare = { row, col };
      this.validMoves = this.getValidMoves(square).map(m => this.algebraicToRC(m.to));
    } else if (piece) {
      this.showError("It's not your turn");
    }
  }

  onPromotionSelect(piece: string) {
    if (!this.promotionPending || !this.game || !this.game.id) return;
    this.loading = true;
    this.gameService.submitMove(this.game.id, {
      source: this.promotionPending.from,
      target: this.promotionPending.to,
      promotion: piece
    }).subscribe({
      next: (game) => {
        if (game && game['fenPosition']) {
          game['currentFen'] = game['fenPosition'];
        }
        this.game = game;
        if (game && game['currentFen']) {
          this.chess.load(game['currentFen']);
          this.generateBoard();
          this.updateGameStatus();
          this.updateMoveHistory();
          this.updateGameOver();
        }
        this.selectedSquare = null;
        this.promotionPending = null;
        this.promotionColor = null;
        this.loading = false;
        this.fetchMoveHistory();
      },
      error: (err) => {
        this.errorMessage = 'Failed to submit promotion move';
        this.loading = false;
      }
    });
  }

  isSelected(row: number, col: number): boolean {
    return this.selectedSquare?.row === row && this.selectedSquare?.col === col;
  }

  isValidMove(from: Square, to: Square): boolean {
    return this.chess.moves({ square: from, verbose: true }).some((m: Move) => m.to === to);
  }

  getValidMoves(square: Square): Move[] {
    return this.chess.moves({ square, verbose: true }) as Move[];
  }

  isPieceTurn(piece: string): boolean {
    return (this.chess.turn() === 'w' && piece === piece.toUpperCase()) ||
           (this.chess.turn() === 'b' && piece === piece.toLowerCase());
  }

  isValidTarget(row: number, col: number): boolean {
    return this.validMoves.some(sq => sq.row === row && sq.col === col);
  }

  rcToAlgebraic(row: number, col: number): string {
    // If board is flipped, adjust row
    const r = this.orientation === 'black' ? 7 - row : row;
    const c = col;
    return String.fromCharCode(97 + c) + (8 - r);
  }

  algebraicToRC(square: string): { row: number, col: number } {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1], 10);
    const row = this.orientation === 'black' ? 7 - rank : rank;
    return { row, col: file };
  }

  getPromotionOptions(): string[] {
    if (!this.promotionColor) return [];
    return PROMOTION_PIECES.map(p => this.promotionColor === 'w' ? p.toUpperCase() : p);
  }

  showError(msg: string) {
    this.errorMessage = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => {
      this.errorMessage = null;
    }, 1500);
  }

  clearError() {
    this.errorMessage = null;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
  }

  updateGameStatus() {
    if (this.chess.isCheckmate()) {
      this.gameStatus = `Checkmate! ${this.chess.turn() === 'w' ? 'Black' : 'White'} wins.`;
    } else if (this.chess.isStalemate()) {
      this.gameStatus = 'Stalemate! Draw.';
    } else if (this.chess.isDraw()) {
      this.gameStatus = 'Draw!';
    } else if (this.chess.inCheck()) {
      this.gameStatus = `${this.chess.turn() === 'w' ? 'White' : 'Black'} is in check.`;
    } else {
      this.gameStatus = `${this.chess.turn() === 'w' ? 'White' : 'Black'} to move.`;
    }
  }

  updateMoveHistory() {
    // Get move history in algebraic notation
    this.moveHistory = this.chess.history();
  }

  newGame() {
    this.chess.reset();
    this.generateBoard();
    this.updateGameStatus();
    this.updateMoveHistory();
    this.updateGameOver();
  }

  undoMove() {
    this.chess.undo();
    this.generateBoard();
    this.updateGameStatus();
    this.updateMoveHistory();
    this.updateGameOver();
  }

  updateGameOver() {
    this.gameOver = this.chess.isCheckmate() || this.chess.isStalemate() || this.chess.isDraw();
  }

  fetchMoveHistory() {
    if (this.game && this.game.id) {
      this.gameService.getMoveHistory(this.game.id).subscribe({
        next: (moves) => {
          this.fullMoveHistory = moves;
          console.log('White captured:', this.getCapturedPieces('w'));
          console.log('Black captured:', this.getCapturedPieces('b'));
        },
        error: (err) => {
          this.fullMoveHistory = [];
        }
      });
    }
  }

  getCapturedPieces(color: 'w' | 'b'): string[] {
    if (!this.game) return [];
    const captured: string[] = [];
    let turn: 'w' | 'b' = 'w'; // Chess always starts with white

    for (const move of this.fullMoveHistory) {
      if (move.capturedPiece) {
        // If color is 'w', we want pieces captured FROM white (i.e., when turn is 'b')
        // If color is 'b', we want pieces captured FROM black (i.e., when turn is 'w')
        if (
          (color === 'w' && turn === 'b') ||
          (color === 'b' && turn === 'w')
        ) {
          captured.push(move.capturedPiece);
        }
      }
      // Alternate turn for next move
      turn = turn === 'w' ? 'b' : 'w';
    }
    return captured;
  }

  getMovePieceSymbol(move: any): string {
    if (!move || !move.pieceType) return this.getPieceSymbol('');
    let code = '';
    if (move.pieceType.toUpperCase() === 'PAWN') {
      code = move.player && move.player.toLowerCase() === 'white' ? 'P' : 'p';
    } else {
      code = move.pieceType.charAt(0);
      code = move.player && move.player.toLowerCase() === 'white'
        ? code.toUpperCase()
        : code.toLowerCase();
    }
    return this.getPieceSymbol(code);
  }
} 