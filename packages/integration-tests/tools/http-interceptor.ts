import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';

export class HttpInterceptor implements Disposable {
  private readonly server = setupServer();

  private constructor() {
    this.server.listen({ onUnhandledRequest: 'error' });
  }

  static create(): HttpInterceptor {
    return new HttpInterceptor();
  }

  mockJson(url: string, response: JsonBodyType): void {
    this.server.use(http.get(url, () => HttpResponse.json(response)));
  }

  [Symbol.dispose](): void {
    this.server.close();
  }
}
