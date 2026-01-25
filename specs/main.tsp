import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Project API" })
namespace ProjectApi;

model Message {
  id: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

@route("/hello-world")
interface HelloWorld {
  @get list(): Message;
}
