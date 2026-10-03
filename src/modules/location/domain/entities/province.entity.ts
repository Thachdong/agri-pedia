export type TProvinceProps = {
  /** Stable key, e.g. `ha_noi`. */
  codename: string;
  name: string;
};

/** Province/city (master data, read-only). */
export class Province {
  private constructor(private readonly props: TProvinceProps) {}

  static restore(props: TProvinceProps): Province {
    return new Province({ ...props });
  }

  get codename(): string {
    return this.props.codename;
  }

  get name(): string {
    return this.props.name;
  }
}
