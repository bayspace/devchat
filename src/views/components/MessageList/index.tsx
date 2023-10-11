
import { Stack, Container, Divider, Box } from "@mantine/core";
import React, { useEffect } from "react";
import MessageBody from "@/views/components/MessageBody";
import MessageAvatar from "@/views/components/MessageAvatar";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";
import MessageContext from "@/views/components/MessageContext";
import CurrentMessage from "@/views/components/CurrentMessage";


const MessageList = observer((props: any) => {
    const { chat } = useMst();

    return (<Stack spacing={0} sx={{margin:'0 10px 10px 10px'}}>
        {chat.messages.map((item, index: number) => {
            const { message: messageText, type: messageType, hash: messageHash, contexts } = item;
            // setMessage(messageText);
            return <Stack
                spacing={0}
                key={`message-${index}`}
                sx={{
                    padding: 0,
                    margin: 0
                }}>
                <MessageAvatar
                    key={`message-header-${index}`}
                    showDelete={index === chat.messages.length - 2}
                    deleteHash={messageHash}
                    avatarType={messageType}
                    copyMessage={messageText}
                    messageContexts={contexts} />
                <Box
                    key={`message-container-${index}`}
                    sx={{
                        margin: 0,
                        padding: 0,
                        pre: {
                            whiteSpace: 'break-spaces'
                        },
                    }}>
                    <MessageContext key={`message-context-${index}`} contexts={contexts} />
                    <MessageBody key={`message-codeblock-${index}`} messageType={messageType} >
                        {messageText}
                    </MessageBody>
                </Box >
                {index !== chat.messages.length - 1 && <Divider my={3} key={`message-divider-${index}`} />}
            </Stack >;
        })}
        <CurrentMessage />
    </Stack>);
});

export default MessageList;