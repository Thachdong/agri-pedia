import { EProductSuggestionStatus } from '../../../domain';

export class ProductSuggestionContentResponse {
  name: string;
  description: string;
}

export class SuggestProductResponse {
  /** UNREADABLE: no name read (retake or type it). NOT_FOUND: name read, not in the catalog. FOUND: `suggestion` set. */
  status: EProductSuggestionStatus;
  /** Suggestions left for the caller. */
  remaining: number;
  /** NOT_FOUND only: the name read from the photo, to prefill the form. */
  detectedName?: string;
  /** FOUND only: values for the product form. */
  suggestion?: ProductSuggestionContentResponse;
}
