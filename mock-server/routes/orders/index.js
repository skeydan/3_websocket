"use strict";

export default async function (fastify, opts) {
  function monitorMessages(socket) {
    socket.on("message", (data) => {
      const message = JSON.parse(data);
      try {
        if (message.cmd === "update-category") {
          return sendCurrentOrders(message.payload.category, socket);
        }
      } catch (err) {
        fastify.log.warn(
          "WebSocket Message (data: %o) Error: %s",
          message,
          err.message
        );
      }
    });
  }

  function sendCurrentOrders(category, socket) {
  const orders = Array.from(fastify.currentOrders(category));
  for (const order of orders) {
    socket.send(order);
  }
}

  fastify.get(
    "/:category",
    { websocket: true },
    async (socket, request) => {
      monitorMessages(socket);
      sendCurrentOrders(request.params.category, socket);
      for await (const order of fastify.realtimeOrders()) {
        if (socket.readyState >= socket.CLOSING) break;
        socket.send(order);
      }
    }
  );

  fastify.post("/:id", async (request) => {
    const { id } = request.params;
    fastify.addOrder(id, request.body.amount);
    return { ok: true };
  });
} 