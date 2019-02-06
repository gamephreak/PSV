export type ID = string&{__isID: true};

// tslint:disable-next-line:no-any
export function toID(text: any) {
  if (text && text.id) {
    text = text.id;
  } else if (text && text.userid) {
    text = text.userid;
  }

  if (typeof text !== 'string' && typeof text !== 'number') {
    return '' as ID;
  }

  return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '') as ID;
}
