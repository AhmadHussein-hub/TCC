import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../main.dart'; // Para acessar o navigatorKey
import '../widgets/alerta_omissao_dialog.dart';

class FirebaseMessagingService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  // Token salvo estaticamente para poder ser acessado pela UI
  static String? fcmToken;

  Future<void> init() async {
    // 1. Solicita permissão para receber notificações
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('Permissão de notificação concedida.');
    }

    // 2. Escuta mensagens recebidas enquanto o app estiver em primeiro plano
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Recebeu uma mensagem em primeiro plano: ${message.messageId}');
      _exibirAlertaOmissao(message);
    });

    // 3. Captura se o app foi aberto clicando na notificação
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('App aberto a partir da notificação: ${message.messageId}');
      _exibirAlertaOmissao(message);
    });

    // 4. Obtém e salva o token FCM do dispositivo
    fcmToken = await _firebaseMessaging.getToken();
    print('Token do Firebase: $fcmToken');
  }

  void _exibirAlertaOmissao(RemoteMessage message) {
    // Pegar o contexto global a partir do navigatorKey
    final context = navigatorKey.currentContext;
    if (context == null) return;

    // Extrai dados da notificação (ajuste conforme os campos enviados pelo seu backend/Alexa)
    final data = message.data;
    final nomePaciente = data['nome_paciente'] ?? 'Sr. João Silva';
    final idadePaciente = data['idade_paciente'] ?? '78 anos';
    final endereco = data['endereco'] ?? 'Rua das Flores, 42';
    final medicamento = data['medicamento'] ?? 'Losartana 50mg';
    final horario = data['horario'] ?? '08:00';

    showDialog(
      context: context,
      barrierDismissible: false, // Força o cuidador a tomar uma ação
      builder: (BuildContext context) {
        return AlertaOmissaoDialog(
          nomePaciente: nomePaciente,
          idadePaciente: idadePaciente,
          endereco: endereco,
          medicamento: medicamento,
          horario: horario,
          onLigar: () {
            // Lógica para ligar para o paciente (ex: url_launcher)
            print("Ligando para $nomePaciente...");
            Navigator.pop(context);
          },
          onMarcarTomado: () {
            // Lógica para salvar no Supabase que foi tomado manualmente
            print("Marcando $medicamento como tomado.");
            Navigator.pop(context);
          },
        );
      },
    );
  }
}
