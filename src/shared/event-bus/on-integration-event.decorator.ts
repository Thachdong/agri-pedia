import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * Subscribes a provider method to an integration event.
 * The publisher awaits the handler, but a failing handler is logged and never propagates:
 * the publisher's transaction is already committed.
 */
export const OnIntegrationEvent =
  (name: string): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    const handler = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await handler.apply(this, args);
      } catch (error) {
        logger.error(
          `Handler ${String(propertyKey)} failed for "${name}"`,
          (error as Error)?.stack,
        );
      }
    };

    OnEvent(name)(target, propertyKey, descriptor);
  };
