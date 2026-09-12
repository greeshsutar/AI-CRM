import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should format HttpException properly', () => {
    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn().mockReturnThis();
    const responseMock = {
      status: statusMock,
      json: jsonMock,
    };
    const requestMock = {
      url: '/test-url',
    };
    const hostMock = {
      switchToHttp: () => ({
        getResponse: () => responseMock,
        getRequest: () => requestMock,
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    filter.catch(exception, hostMock);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
        path: '/test-url',
      }),
    );
  });
});
