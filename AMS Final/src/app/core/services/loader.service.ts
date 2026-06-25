import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = 0;
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  private hideTimeout: any = null;

  constructor() {}

  /**
   * Increments the active requests counter and enables loading.
   */
  show(): void {
    this.activeRequests++;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.isLoadingSubject.next(true);
  }

  /**
   * Decrements the active requests counter and disables loading if counter hits zero.
   * Delays the actual state change slightly to prevent flickering during sequential requests.
   */
  hide(): void {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
      }
      this.hideTimeout = setTimeout(() => {
        this.isLoadingSubject.next(false);
        this.hideTimeout = null;
      }, 300); // 300ms debounce bridge
    }
  }

  /**
   * Resets the active requests counter and loading state immediately.
   */
  reset(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.activeRequests = 0;
    this.isLoadingSubject.next(false);
  }
}

