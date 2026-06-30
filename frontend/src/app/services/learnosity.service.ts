import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Trimmed port of
 * fe/apps/otus-app/src/features/assessments/advanced/learnosity.service.ts.
 *
 * Keeps only what the POC needs: dynamic script loading (Items / Events / MathJax),
 * Items + Events API init, and a signing call to the local backend. All Otus CRUD /
 * session / grading / Reports / Author methods are intentionally dropped.
 */

// Learnosity globals injected by the loaded scripts.
declare class LearnosityItems {
  static init(o: any, config: any): any;
}
declare class LearnosityEvents {
  static init(o: any, config: any): any;
}

// Learnosity script URLs (from fe/.../core/config/default.ts + my-west.otus.dev.ts).
const API_VERSION = '?v2025.2.LTS';
const ITEMS_API_URL = `https://items.learnosity.com${API_VERSION}`;
const EVENTS_API_URL = `https://events.learnosity.com${API_VERSION}`;
const MATHJAX_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';

@Injectable({ providedIn: 'root' })
export class LearnosityService {
  learnosityItemsApp: any;
  learnosityEventsApp: any;

  constructor(private http: HttpClient) {
    this.loadMathJaxScriptFromUrl(MATHJAX_URL);
  }

  // ---- script loading ----------------------------------------------------

  loadItemsApi(callback: (ev: Event | null) => void): void {
    try {
      if (this.learnosityItemsApp) {
        this.learnosityItemsApp?.reset();
        this.learnosityItemsApp = null;
      }
    } catch (e) {
      // Learnosity throws if you reset an already-reset app; safe to ignore on reload.
    }
    this.loadScriptFromUrl(ITEMS_API_URL, callback);
  }

  loadEventsApi(callback: (ev: Event | null) => void): void {
    this.loadScriptFromUrl(EVENTS_API_URL, callback);
  }

  // ---- API init ----------------------------------------------------------

  async initItemsApi(
    request: any,
    readyCallback?: (e?: any) => void,
    errorCallback?: (e: any) => void,
  ): Promise<void> {
    const signedRequest = await this.sign('items', request, request.user_id);
    const eventOptions: any = {};
    if (readyCallback) {
      eventOptions.readyListener = (e: any) => readyCallback(e);
    }
    if (errorCallback) {
      eventOptions.errorListener = (e: any) => errorCallback(e);
    }
    console.log('Items API signed request');
    console.dir(signedRequest, { depth: null });
    this.learnosityItemsApp = (LearnosityItems as any).init(signedRequest, eventOptions);
  }

  async initEventsApi(initRequest: any, eventObject: any): Promise<void> {
    // Events API is signed against the teacher user id.
    const signedRequest = await this.sign('events', initRequest, initRequest.user_id);
    console.log('Events API signed request');
    console.dir(signedRequest, { depth: null });
    this.learnosityEventsApp = (LearnosityEvents as any).init(signedRequest, eventObject);
  }

  // ---- signing -----------------------------------------------------------

  /**
   * Replaces the Otus `getSignature` NodeApiService call: POST the request to the
   * local signing backend and return the signed payload.
   */
  private sign(service: string, request: any, user_id?: string): Promise<any> {
    return firstValueFrom(
      this.http.post('/sign', {
        service,
        request,
        user_id,
        domain: window.location.hostname,
      }),
    );
  }

  /**
   * Fetch the Events API `users` map ({ user_id: hash }) from the backend, so the
   * consumer secret is never exposed in the browser. Separate endpoint from /sign,
   * matching Learnosity's documented Events API flow.
   */
  getEventsUsers(userIds: string[]): Promise<Record<string, string>> {
    return firstValueFrom(
      this.http.post<Record<string, string>>('/events-users', { user_ids: userIds }),
    );
  }

  // ---- script injection helpers (refactored from jQuery to vanilla DOM) ---

  loadScriptFromUrl(url: string, callback: (ev: Event | null) => void): void {
    const alreadyLoaded = Array.from(document.getElementsByTagName('script')).some(
      (s) => s.getAttribute('src') === url,
    );

    if (alreadyLoaded) {
      callback(null);
      return;
    }

    const apiScript = document.createElement('script');
    apiScript.type = 'text/javascript';
    apiScript.async = true;
    apiScript.src = url;
    apiScript.onload = callback;

    const ref = document.getElementsByTagName('script')[0];
    ref.parentNode?.insertBefore(apiScript, ref);
  }

  // MathJax config block ported as-is from the Otus service (handles LaTeX rendering
  // inside Learnosity items).
  loadMathJaxScriptFromUrl(mathJaxUrl: string, callback?: (ev: Event | null) => void): void {
    const hasConfigScript = document.getElementById('MathJaxConfigScript') !== null;
    let hasUrlScript = document.getElementById('MathJaxUrlScript') !== null;

    if (!mathJaxUrl?.length || (hasConfigScript && hasUrlScript)) {
      callback?.(null);
      return;
    }

    if (!hasConfigScript && hasUrlScript) {
      const existingUrlScript = document.getElementById('MathJaxUrlScript');
      existingUrlScript?.parentNode?.removeChild(existingUrlScript);
      hasUrlScript = false;
    }

    if (!hasConfigScript) {
      const configScript = document.createElement('script');
      configScript.type = 'text/javascript';
      configScript.id = 'MathJaxConfigScript';
      configScript.innerHTML = `
        window.MathJax = {
          loader: {
            load: ['a11y/semantic-enrich', 'a11y/explorer', 'a11y/assistive-mml']
          },
          chtml: { scale: 1, matchFontHeight: false },
          options: {
            enableMenu: false,
            enableAssistiveMml: true,
            enableExplorer: true,
            ignoreHtmlClass: "lrn_noMath",
            enableEnrichment: true,
            sre: {
              speech: 'none',
              domain: 'mathspeak',
              style: 'default',
              locale: 'en'
            }
          },
          tex: {
            macros: {
              abs:['{|#1|}',1],
              degree:['°'],
              longdiv:['{\\enclose{longdiv}{#1}}',1],
              atomic:['{_{#1}^{#2}}',2],
              polyatomic:['{_{#2}{}^{#1}}',2],
              circledot:['{\\odot}'],
              parallelogram:['\\\\unicode{x25B1}'],
              ngtr:['\\\\unicode{x226F}'],
              nless:['\\\\unicode{x226E}'],
              MathQuillVarField:['#1',1],
              overarc:['{\\\\overparen{#1}}',1]
            }
          }
        }
      `;
      const refConfig = document.getElementsByTagName('script')[0];
      refConfig?.parentNode?.insertBefore(configScript, refConfig);
    }

    if (!hasUrlScript) {
      const apiScript = document.createElement('script');
      apiScript.type = 'text/javascript';
      apiScript.id = 'MathJaxUrlScript';
      apiScript.async = true;
      apiScript.src = mathJaxUrl;
      apiScript.onload = (ev) => callback?.(ev);

      const refMathJaxConfigScript = document.getElementById('MathJaxConfigScript');
      refMathJaxConfigScript?.insertAdjacentElement('afterend', apiScript);
    }
  }
}
