const markdownLinkPattern = /\[([^\]\r\n]+)\]\((https?:\/\/[^)\s]+)\)/gi;

export function twoLayerDisplayText(value: string) {
  return value.replace(markdownLinkPattern, "$1");
}
