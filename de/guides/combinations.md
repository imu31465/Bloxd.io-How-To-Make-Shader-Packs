# Mit anderen Paketen kombinieren, wenn der Shader allein ans Limit stößt



Da Pakete keine Texturen hinzufügen oder sampeln können, keine feinen Material-Bumps oder Himmelsbilder per Shader allein lösen wollen. Das öffentliche Texturpaket-Repo für Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) behandelt Texturen, Skybox, Modelle etc. auf anderem Weg.

Als Referenz entpuppten sich in einem Fall analysierte Community-„Cinematic-Shader"-Distributionen als Texturpakete (128x128-Texturen ohne `pack.json` / `.wgsl`).

In der Praxis **Licht und Farbe per Shader tunen und Materialien plus Himmel per passendem Ressourcenpaket abdecken**. Aber Co-Nutzung und Ladereihenfolge gegen Spiel-Implementierung und -Einstellungen prüfen.

Texturpakete haben ihre eigene Spezifikation (als Referenz): Das Größenlimit liegt bei 25MB, gemessen als Länge des base64-kodierten JSON-Strings; Base64-Kodierung eines PNG bläht es um +33% auf, das praktische Limit für Rohbilder liegt also bei ~18–19MB. CSS wird von einem einfachen Regex-Parser verarbeitet — Verschachtelung und Kommentare vermeiden.
