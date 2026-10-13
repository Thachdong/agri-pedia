export type TCropProps = {
  /** Stable key, e.g. `RICE`. */
  code: string;
  nameVi: string;
  /** Supported by diagnosis. */
  enabled: boolean;
};

/** Crop (master data, read-only). */
export class Crop {
  private constructor(private readonly props: TCropProps) {}

  static restore(props: TCropProps): Crop {
    return new Crop({ ...props });
  }

  get code(): string {
    return this.props.code;
  }

  get nameVi(): string {
    return this.props.nameVi;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }
}
