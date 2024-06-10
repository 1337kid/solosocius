import { NextResponse } from 'next/server'
import { headers } from "next/headers";
import connectToDB from '@/utils/connectToDB'
import User from '@/models/user'
import { getActor, sendSignedRequest, verifySignature } from '@/utils/activitypub'
import genFollowAcceptActivity from '@/utils/activitypub/activity/genFollowAcceptActivity';

export const POST = async(req) => {
    const headerList = headers();
    // verify signature
    const isAuthentic = await verifySignature(headerList, req.url);
    try {
        if (isAuthentic) {
            await connectToDB()
            const object = await req.json();
            // if a "Follow" activity, send an "Accept" activity back to the origin
            if (object?.type === "Follow") {
                const actor = await User.findOne({"fediverse.self": object.object}, {"fediverse":1,_id:0});
                const recipient = new URL(object.actor); // recipient's actor url
                const recipientObject = getActor(recipient.host, recipient.pathname.split('/').reverse()[0])
                // generate "Accept" activity
                const body = genFollowAcceptActivity(actor.fediverse.self, object, "Accept")
                console.log(body)
                const requestStatus = await sendSignedRequest(
                    actor.fediverse.privateKey,
                    recipientObject.inbox,
                    body,
                    `${actor.fediverse.self}#main-key`,
                )
                if (requestStatus) return new NextResponse.json({},{status:200})
                else return new NextResponse.json({error:"error"}, {status:500})
            }
        }
    } catch (error) {
        return NextResponse.json({error:"Internal Server Error"}, {status:500});
    }
    return new NextResponse("lmap")
}