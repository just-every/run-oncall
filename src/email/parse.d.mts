export const emailLimits: {maxRawBytes:number;maxBodyBytes:number;maxAttachments:number;maxAttachmentBytes:number;maxTotalAttachmentBytes:number};
export function parseEmail(message:ForwardableEmailMessage,secret:string):Promise<{subject:string;text:string;sender:string;messageId:string|null}>;
export function emailDiagnostic(error:unknown):string;
