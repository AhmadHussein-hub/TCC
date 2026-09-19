import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'dart:io' show Platform;

import 'login_screen.dart';
import 'add_medicamento_screen.dart';
import 'ai_summary_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    // Chama a função assim que a tela abre, em segundo plano
    registrarTokenNoBanco();
  }

  Future<void> registrarTokenNoBanco() async {
    FirebaseMessaging messaging = FirebaseMessaging.instance;

    // Mostra o pop-up pedindo permissão de notificação (Android 13+ e iOS)
    NotificationSettings settings = await messaging.requestPermission();

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Pega o código único (Token) deste celular
      String? fcmToken = await messaging.getToken();

      if (fcmToken != null) {
        // Verifica qual cuidador está logado no app agora
        final idCuidador = supabase.auth.currentUser?.id;

        if (idCuidador != null) {
          try {
            // Manda para a sua tabela no Supabase
            await supabase.from('push_token').upsert({
              'id_cuidador': idCuidador,
              'token_fcm': fcmToken,
              'plataforma': Platform.isAndroid ? 'Android' : 'iOS',
              'ativo': true,
              'updated_at': DateTime.now().toIso8601String(),
            });
            debugPrint("Token salvo no Supabase com sucesso!");
          } catch (e) {
            debugPrint("Erro ao salvar token: $e");
          }
        }
      }
    }
  }

  // Função para buscar na tabela "medicamento"
  Future<List<dynamic>> _buscarMedicamentos() async {
    final response = await supabase
        .from('medicamento')
        .select()
        .order('nome_farmaco', ascending: true); // Ordena em ordem alfabética
    return response;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Painel do Cuidador'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome),
            tooltip: 'Resumo da IA',
            onPressed: () {
              // TODO: Substituir o 1 pelo ID real do paciente se houver múltiplos pacientes
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AiSummaryScreen(pacienteId: 1)),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sair',
            onPressed: () async {
              await supabase.auth.signOut();
              if (context.mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              }
            },
          )
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _buscarMedicamentos(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Erro ao carregar: ${snapshot.error}'));
          }

          final medicamentos = snapshot.data;
          if (medicamentos == null || medicamentos.isEmpty) {
            return const Center(child: Text('Nenhum medicamento cadastrado.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: medicamentos.length,
            itemBuilder: (context, index) {
              final med = medicamentos[index];
              return Card(
                elevation: 2,
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.medication, color: Colors.teal, size: 36),
                  title: Text(
                    med['nome_farmaco'] ?? 'Sem nome',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  subtitle: Text('Dosagem: ${med['dosagem']}\nTolerância: ${med['limite_atraso_minutos']} min'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          '${med['frequencia_horas']}h',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 16),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        tooltip: 'Excluir medicamento',
                        onPressed: () async {
                          final confirmar = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Confirmar exclusão'),
                              content: Text('Deseja excluir o medicamento ${med['nome_farmaco']}?'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('Cancelar'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Excluir', style: TextStyle(color: Colors.red)),
                                ),
                              ],
                            ),
                          );
                          if (confirmar == true) {
                            try {
                              await supabase.from('medicamento').delete().eq('id_medicamento', med['id_medicamento']);
                              setState(() {}); // Recarrega a lista
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Medicamento excluído com sucesso.')),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Erro ao excluir: $e')),
                                );
                              }
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          // Abre a tela de cadastro e aguarda o retorno
          final recarregar = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AddMedicamentoScreen()),
          );

          // Se o cadastro foi feito (retornou true), atualiza a lista
          if (recarregar == true) {
            setState(() {});
          }
        },
        backgroundColor: Colors.teal,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}