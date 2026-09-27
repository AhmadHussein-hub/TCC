import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../main.dart'; 
import '../widgets/alerta_omissao_dialog.dart';

class FirebaseMessagingService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  
  static String? fcmToken;

  Future<void> init() async {
    
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('Permissão de notificação concedida.');
    }

    
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Recebeu uma mensagem em primeiro plano: ${message.messageId}');
      _exibirAlertaOmissao(message);
    });

    
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('App aberto a partir da notificação: ${message.messageId}');
      _exibirAlertaOmissao(message);
    });

    
    fcmToken = await _firebaseMessaging.getToken();
    print('Token do Firebase: $fcmToken');
  }

  void _exibirAlertaOmissao(RemoteMessage message) {
    
    final context = navigatorKey.currentContext;
    if (context == null) return;

    
    final data = message.data;
    final nomePaciente = data['nome_paciente'] ?? 'Sr. João Silva';
    final idadePaciente = data['idade_paciente'] ?? '78 anos';
    final endereco = data['endereco'] ?? 'Rua das Flores, 42';
    final medicamento = data['medicamento'] ?? 'Losartana 50mg';
    final horario = data['horario'] ?? '08:00';

    showDialog(
      context: context,
      barrierDismissible: false, 
      builder: (BuildContext context) {
        return AlertaOmissaoDialog(
          nomePaciente: nomePaciente,
          idadePaciente: idadePaciente,
          endereco: endereco,
          medicamento: medicamento,
          horario: horario,
          onLigar: () {
            
            print("Ligando para $nomePaciente...");
            Navigator.pop(context);
          },
          onMarcarTomado: () {
            
            print("Marcando $medicamento como tomado.");
            Navigator.pop(context);
          },
        );
      },
    );
  }
}
