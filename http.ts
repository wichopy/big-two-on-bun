
console.log("I'm running Bun on port 3000");

Bun.serve({
  port: 3000,
  fetch(request: Request, server) {
    console.log(`[${request.method}] ${request.url}`);
    return new Response("Hello World from CodeSandbox");
  },
  
})
// export default ;
