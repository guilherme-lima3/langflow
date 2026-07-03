import type { Message } from "@/types/messages";
import { handleMessageEvent } from "../message-event-handler";
import { removeMessages, updateMessage } from "../message-utils";

jest.mock("../message-utils", () => ({
  updateMessage: jest.fn(),
  removeMessages: jest.fn(),
}));

const mockedUpdateMessage = updateMessage as jest.MockedFunction<
  typeof updateMessage
>;
const mockedRemoveMessages = removeMessages as jest.MockedFunction<
  typeof removeMessages
>;

const BACKEND_TIMESTAMP = "2024-01-15T16:51:26.946Z";

beforeEach(() => {
  mockedUpdateMessage.mockClear();
  mockedRemoveMessages.mockClear();
});

describe("handleMessageEvent — token events (clock drift fix)", () => {
  it("should_not_include_timestamp_when_backend_omits_it", () => {
    // Backend emits token event without timestamp (legacy behaviour)
    const tokenData = { id: "msg-1", chunk: "hello" };

    handleMessageEvent("token", tokenData);

    expect(mockedUpdateMessage).toHaveBeenCalledTimes(1);
    const calledWith = mockedUpdateMessage.mock.calls[0][0] as Message;
    // timestamp must NOT be set — the caller's existing message timestamp is preserved
    expect(calledWith).not.toHaveProperty("timestamp");
  });

  it("should_use_backend_timestamp_when_provided", () => {
    const tokenData = {
      id: "msg-1",
      chunk: "hello",
      timestamp: BACKEND_TIMESTAMP,
    };

    handleMessageEvent("token", tokenData);

    expect(mockedUpdateMessage).toHaveBeenCalledTimes(1);
    const calledWith = mockedUpdateMessage.mock.calls[0][0] as Message;
    expect(calledWith.timestamp).toBe(BACKEND_TIMESTAMP);
  });

  it("should_map_chunk_to_text_field", () => {
    const tokenData = { id: "msg-1", chunk: "streamed text" };

    handleMessageEvent("token", tokenData);

    const calledWith = mockedUpdateMessage.mock.calls[0][0] as Message;
    expect(calledWith.text).toBe("streamed text");
  });

  it("should_default_sender_to_Machine_and_sender_name_to_AI", () => {
    handleMessageEvent("token", { id: "msg-1", chunk: "" });

    const calledWith = mockedUpdateMessage.mock.calls[0][0] as Message;
    expect(calledWith.sender).toBe("Machine");
    expect(calledWith.sender_name).toBe("AI");
  });

  it("should_return_true", () => {
    expect(handleMessageEvent("token", { id: "msg-1", chunk: "" })).toBe(true);
  });
});

describe("handleMessageEvent — add_message events", () => {
  it("should_call_updateMessage_and_return_true", () => {
    const message = { id: "msg-1", text: "hi" } as Message;

    const result = handleMessageEvent("add_message", message);

    expect(mockedUpdateMessage).toHaveBeenCalledWith(message);
    expect(result).toBe(true);
  });
});

describe("handleMessageEvent — remove_message events", () => {
  it("should_call_removeMessages_and_return_true", () => {
    const data = { id: "msg-1", session_id: "s1", flow_id: "f1" };

    const result = handleMessageEvent("remove_message", data);

    expect(mockedRemoveMessages).toHaveBeenCalledWith(["msg-1"], "s1", "f1");
    expect(result).toBe(true);
  });
});

describe("handleMessageEvent — unknown events", () => {
  it("should_return_false_for_unrecognised_event_type", () => {
    expect(handleMessageEvent("some_other_event", {})).toBe(false);
  });
});
