export function getBadgeClass(kind: string) {
  switch (kind) {
    case "green":
    case "active":
      return "badge badge-success";
    case "yellow":
    case "paused":
    case "medium":
      return "badge badge-warn";
    case "red":
    case "urgent":
      return "badge badge-danger";
    default:
      return "badge badge-neutral";
  }
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMinutes = date.getTimezoneOffset();
  const localTime = new Date(date.getTime() - offsetMinutes * 60_000);
  return localTime.toISOString().slice(0, 16);
}
