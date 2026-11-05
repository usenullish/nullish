export const hasArgs = ({ args, options }: { args?: string[]; options: string[] }): boolean =>
  args?.find((arg) => options.includes(arg)) !== undefined;
