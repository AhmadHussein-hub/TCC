import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart'; 
import 'login_screen.dart'; 
import 'services/firebase_messaging_service.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Carrega variáveis do arquivo .env
  await dotenv.load(fileName: ".env");

  // Liga o Firebase
  await Firebase.initializeApp();

  // Inicializa o serviço de notificações do Firebase
  await FirebaseMessagingService().init();

  // Inicialização do Supabase
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  runApp(const MeuTccApp());
}

class MeuTccApp extends StatelessWidget {
  const MeuTccApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'App do Cuidador - TCC',
      debugShowCheckedModeBanner: false, 
      theme: buildAppTheme(), 
      home: const LoginScreen(),
    );
  }

  // Função que define o design system do app
  ThemeData buildAppTheme() {
    const Color primaryBlue = Color(0xFF2563EB); // Azul principal dos botões e header
    const Color backgroundLight = Color(0xFFF8FAFC); // Fundo cinza/azulado bem claro
    const Color textDark = Color(0xFF0F172A); // Cor principal do texto
    const Color borderLight = Color(0xFFE2E8F0); // Bordas dos inputs e cards

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: backgroundLight,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.light(
        primary: primaryBlue,
        secondary: textDark,
        error: Color(0xFFEF4444), // Vermelho de alerta
        surface: Colors.white,
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: textDark,
        displayColor: textDark,
      ),
      
      // Estilo Global dos Botões (Baseado na Tela Login e Agendamento)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(double.infinity, 54),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Estilo Global dos Campos de Texto (Inputs)
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryBlue, width: 2),
        ),
      ),
    );
  }
}