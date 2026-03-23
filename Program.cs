var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Enkel health-check
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = "AYO ABC" }));

app.Run();
