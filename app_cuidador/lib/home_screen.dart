import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'login_screen.dart';
import 'add_medicamento_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final supabase = Supabase.instance.client;

  // Função atualizada para buscar na tabela "medicamento"
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
                  
                  // Atualizado para "nome_farmaco"
                  title: Text(med['nome_farmaco'] ?? 'Sem nome', 
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  
                  // Atualizado para incluir a dosagem e o limite de atraso
                  subtitle: Text('Dosagem: ${med['dosagem']}\nTolerância: ${med['limite_atraso_minutos']} min'),
                  
                  // Atualizado para "frequencia_horas" e botão de excluir
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
                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Excluir', style: TextStyle(color: Colors.red))),
                              ],
                            ),
                          );
                          if (confirmar == true) {
                            try {
                              await supabase.from('medicamento').delete().eq('id_medicamento', med['id_medicamento']);
                              setState(() {}); // Recarrega a lista
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Medicamento excluído com sucesso.')));
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro ao excluir: $e')));
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