/** Some IMEs report the final candidate key as 229 after isComposing clears. */
export function isCompositionKey(event:Pick<KeyboardEvent,'isComposing'|'keyCode'>){
 return event.isComposing||event.keyCode===229
}

/** Keep Escape for cancelling an IME candidate instead of dismissing its dialog. */
export function preserveCompositionEscape(event:KeyboardEvent){
 if(isCompositionKey(event))event.preventDefault()
}
