import { useEffect, useState } from "react";
export function BootSequence({ onReady }: { onReady: (name: string) => void }) {
  const [progress, setProgress] = useState(0),
    [name, setName] = useState("COMMANDER");
  useEffect(() => {
    const timer = setInterval(() => setProgress((v) => Math.min(100, v + 4)), 45);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="boot">
      <div className="bootbox">
        <div className="bootlogo">
          <span>LS</span>
        </div>
        <h1>LOOKSPACE</h1>
        <p>{progress < 100 ? "SINCRONIZANDO SISTEMAS ORBITAIS" : "IDENTIFICAÇÃO DO PILOTO"}</p>
        <div className="loadline">
          <div style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && (
          <form
            className="login"
            onSubmit={(e) => {
              e.preventDefault();
              onReady(name);
            }}
          >
            <input
              aria-label="Nome do piloto"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
            />
            <button>ENTRAR</button>
          </form>
        )}
      </div>
    </div>
  );
}
