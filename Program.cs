var builder = WebApplication.CreateBuilder(args);

// Kör alltid på http://localhost:5000
builder.WebHost.UseUrls("http://localhost:5000");

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = "AYO ABC" }));

app.Run();
