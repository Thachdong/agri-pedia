export type TWardProps = {
  /** Unique within its province only, e.g. `phuong_ba_dinh`. */
  codename: string;
  name: string;
  provinceCodename: string;
};

/** Ward/commune of a province (master data, read-only). */
export class Ward {
  private constructor(private readonly props: TWardProps) {}

  static restore(props: TWardProps): Ward {
    return new Ward({ ...props });
  }

  get codename(): string {
    return this.props.codename;
  }

  get name(): string {
    return this.props.name;
  }

  get provinceCodename(): string {
    return this.props.provinceCodename;
  }
}
