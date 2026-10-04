' Forja: executa um script do PowerShell sem piscar janela de console.
' Usado pelas tarefas da pasta \Forja\ do Agendador:
'   wscript.exe //B //Nologo "executar-oculto.vbs" "C:\...\abrir.ps1" [outros argumentos]
' Espera o PowerShell terminar e devolve o codigo de saida ao Agendador.
' (Arquivo mantido sem acentos de proposito: o wscript nao le UTF-8.)
Option Explicit

Dim shell, powershell, comando, i

If WScript.Arguments.Count < 1 Then
    WScript.Quit 2
End If

Set shell = CreateObject("WScript.Shell")
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"

comando = """" & powershell & """ -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & WScript.Arguments(0) & """"
For i = 1 To WScript.Arguments.Count - 1
    comando = comando & " """ & WScript.Arguments(i) & """"
Next

' 0 = janela oculta; True = esperar o processo terminar.
WScript.Quit shell.Run(comando, 0, True)
