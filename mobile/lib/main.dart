import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://humble-youth-staging.up.railway.app/api/v1',
);

void main() {
  runApp(const MarkatosApp());
}

class MarkatosApp extends StatefulWidget {
  const MarkatosApp({super.key});

  @override
  State<MarkatosApp> createState() => _MarkatosAppState();
}

class _MarkatosAppState extends State<MarkatosApp> {
  late final AppSession session;
  bool ready = false;

  @override
  void initState() {
    super.initState();
    session = AppSession(ApiClient(apiBaseUrl));
    session.restore().whenComplete(() => setState(() => ready = true));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xff0f766e),
      brightness: Brightness.light,
    );

    return AnimatedBuilder(
      animation: session,
      builder: (context, _) => MaterialApp(
        title: 'Markatos',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: scheme,
          scaffoldBackgroundColor: const Color(0xfff6f7f9),
          fontFamily: 'Roboto',
          appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
          cardTheme: CardThemeData(
            elevation: 0,
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        home: ready
            ? AppScope(session: session, child: const MarketplaceShell())
            : const SplashScreen(),
      ),
    );
  }
}

class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.session, required super.child});

  final AppSession session;

  static AppSession of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope missing');
    return scope!.session;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => session != oldWidget.session;
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class AppSession extends ChangeNotifier {
  AppSession(this.api);

  final ApiClient api;
  UserProfile? user;

  bool get isLoggedIn => api.token != null;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    api.token = prefs.getString('access_token');
    if (api.token == null) return;
    try {
      user = UserProfile.fromJson(await api.get('/auth/me'));
    } catch (_) {
      await logout();
    }
  }

  Future<void> login(String phone, String password) async {
    final data = await api.post('/auth/login', {
      'phone': phone,
      'password': password,
    });
    api.token = data['access_token'] as String;
    user = UserProfile.fromJson(data['user'] as Map<String, dynamic>);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', api.token!);
    notifyListeners();
  }

  Future<void> register(
    String phone,
    String password,
    String countryCode,
  ) async {
    final data = await api.post('/auth/register', {
      'phone': phone,
      'password': password,
      'country_code': countryCode,
    });
    api.token = data['access_token'] as String;
    user = UserProfile.fromJson(data['user'] as Map<String, dynamic>);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', api.token!);
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    notifyListeners();
  }
}

class ApiClient {
  ApiClient(this.baseUrl);

  final String baseUrl;
  String? token;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Future<dynamic> get(String path) async {
    final uri = _uri(path);
    final response = await http.get(uri, headers: _headers);
    return _decode(response, uri);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final uri = _uri(path);
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode(body),
    );
    return _decode(response, uri);
  }

  dynamic _decode(http.Response response, Uri uri) {
    final body = utf8.decode(response.bodyBytes);
    final contentType = response.headers['content-type'] ?? '';
    final trimmed = body.trimLeft();
    final looksLikeHtml =
        trimmed.startsWith('<!doctype') ||
        trimmed.startsWith('<html') ||
        contentType.contains('text/html');

    if (looksLikeHtml) {
      throw ApiException(
        'Cette URL ne répond pas comme une API JSON. '
        'Vérifiez que API_URL pointe vers le backend FastAPI, pas vers le frontend. '
        'URL appelée: $uri',
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body.isEmpty) {
        return null;
      }
      return jsonDecode(body);
    }

    var message = 'Erreur serveur (${response.statusCode}) sur $uri.';
    try {
      final data = jsonDecode(body);
      final detail = data['detail'] ?? data['message'];
      if (detail is String) {
        message = detail;
      }
      if (detail is List && detail.isNotEmpty) {
        message = detail.first['msg']?.toString() ?? message;
      }
    } catch (_) {}
    throw ApiException(message);
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class UserProfile {
  UserProfile({
    required this.id,
    required this.phone,
    required this.countryCode,
    required this.isAdmin,
  });

  final String id;
  final String phone;
  final String countryCode;
  final bool isAdmin;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    phone: json['phone'] as String,
    countryCode: json['country_code'] as String? ?? 'BI',
    isAdmin: json['is_admin'] as bool? ?? false,
  );
}

class Category {
  Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.active,
  });

  final String id;
  final String name;
  final String? icon;
  final bool active;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'] as String,
    name: json['name'] as String,
    icon: json['icon'] as String?,
    active: json['active'] as bool? ?? true,
  );
}

class ListingImage {
  ListingImage({required this.url, this.thumbnailUrl, required this.primary});

  final String url;
  final String? thumbnailUrl;
  final bool primary;

  factory ListingImage.fromJson(Map<String, dynamic> json) => ListingImage(
    url: json['image_url'] as String,
    thumbnailUrl: json['thumbnail_url'] as String?,
    primary: json['is_primary'] as bool? ?? false,
  );
}

class Listing {
  Listing({
    required this.id,
    required this.title,
    required this.price,
    required this.currency,
    required this.condition,
    required this.countryCode,
    required this.images,
    required this.createdAt,
  });

  final String id;
  final String title;
  final num? price;
  final String currency;
  final String? condition;
  final String countryCode;
  final List<ListingImage> images;
  final DateTime? createdAt;

  ListingImage? get primaryImage {
    if (images.isEmpty) return null;
    return images.firstWhere(
      (image) => image.primary,
      orElse: () => images.first,
    );
  }

  factory Listing.fromJson(Map<String, dynamic> json) => Listing(
    id: json['id'] as String,
    title: json['title'] as String,
    price: json['price'] == null
        ? null
        : num.tryParse(json['price'].toString()),
    currency: json['currency'] as String? ?? 'BIF',
    condition: json['condition'] as String?,
    countryCode: json['country_code'] as String? ?? 'BI',
    images: (json['images'] as List? ?? [])
        .map((item) => ListingImage.fromJson(item as Map<String, dynamic>))
        .toList(),
    createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
  );
}

String money(num? value, String currency) {
  if (value == null) return 'Prix à discuter';
  final text = value.round().toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => ' ',
  );
  return '$text $currency';
}

class MarketplaceShell extends StatefulWidget {
  const MarketplaceShell({super.key});

  @override
  State<MarketplaceShell> createState() => _MarketplaceShellState();
}

class _MarketplaceShellState extends State<MarketplaceShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const HomePage(),
      const SearchPage(),
      const PublishPage(),
      const ProfilePage(),
    ];

    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Accueil',
          ),
          NavigationDestination(icon: Icon(Icons.search), label: 'Recherche'),
          NavigationDestination(
            icon: Icon(Icons.add_box_outlined),
            selectedIcon: Icon(Icons.add_box),
            label: 'Vendre',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Compte',
          ),
        ],
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  Future<HomeData>? future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    future ??= load();
  }

  Future<HomeData> load() async {
    final api = AppScope.of(context).api;
    final results = await Future.wait([
      api.get('/categories'),
      api.get('/listings?limit=12&sort=newest&country_code=BI'),
    ]);
    return HomeData(
      categories: (results[0] as List)
          .map((item) => Category.fromJson(item as Map<String, dynamic>))
          .where((category) => category.active)
          .toList(),
      listings: ((results[1] as Map<String, dynamic>)['items'] as List)
          .map((item) => Listing.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        final next = load();
        setState(() => future = next);
        await next;
      },
      child: FutureBuilder<HomeData>(
        future: future,
        builder: (context, snapshot) {
          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverAppBar.large(
                title: const Text('Markatos'),
                actions: [
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.notifications_outlined),
                  ),
                ],
              ),
              SliverToBoxAdapter(child: HeroSearchCard(onSearch: _openSearch)),
              if (snapshot.connectionState == ConnectionState.waiting)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (snapshot.hasError)
                SliverFillRemaining(
                  child: ErrorState(
                    message: snapshot.error.toString(),
                    onRetry: () => setState(() => future = load()),
                  ),
                )
              else ...[
                SliverToBoxAdapter(
                  child: CategoryRail(categories: snapshot.data!.categories),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: .72,
                        ),
                    itemCount: snapshot.data!.listings.length,
                    itemBuilder: (context, index) =>
                        ListingCard(listing: snapshot.data!.listings[index]),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  void _openSearch(String query) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => SearchPage(initialQuery: query)));
  }
}

class HomeData {
  HomeData({required this.categories, required this.listings});
  final List<Category> categories;
  final List<Listing> listings;
}

class HeroSearchCard extends StatefulWidget {
  const HeroSearchCard({super.key, required this.onSearch});
  final ValueChanged<String> onSearch;

  @override
  State<HeroSearchCard> createState() => _HeroSearchCardState();
}

class _HeroSearchCardState extends State<HeroSearchCard> {
  final controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 18),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(26),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Acheter et vendre en confiance',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            textInputAction: TextInputAction.search,
            onSubmitted: widget.onSearch,
            decoration: InputDecoration(
              hintText: 'Rechercher téléphone, moto, meuble...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                icon: const Icon(Icons.arrow_forward),
                onPressed: () => widget.onSearch(controller.text),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CategoryRail extends StatelessWidget {
  const CategoryRail({super.key, required this.categories});
  final List<Category> categories;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 104,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          final category = categories[index];
          return Container(
            width: 110,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  _iconFor(category.icon),
                  color: Theme.of(context).colorScheme.primary,
                ),
                const Spacer(),
                Text(
                  category.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemCount: categories.take(10).length,
      ),
    );
  }
}

IconData _iconFor(String? value) {
  final key = value?.toLowerCase() ?? '';
  if (key.contains('car') || key.contains('auto')) return Icons.directions_car;
  if (key.contains('home') || key.contains('house')) return Icons.chair;
  if (key.contains('phone') || key.contains('mobile')) {
    return Icons.phone_iphone;
  }
  if (key.contains('fashion')) return Icons.checkroom;
  return Icons.grid_view_rounded;
}

class SearchPage extends StatefulWidget {
  const SearchPage({super.key, this.initialQuery = ''});
  final String initialQuery;

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final controller = TextEditingController();
  List<Listing> listings = [];
  bool loading = false;
  bool hasMore = false;
  int offset = 0;
  String? error;
  static const pageSize = 12;

  bool _loadedOnce = false;

  @override
  void initState() {
    super.initState();
    controller.text = widget.initialQuery;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedOnce) {
      return;
    }
    _loadedOnce = true;
    unawaited(search(reset: true));
  }

  Future<void> search({required bool reset}) async {
    setState(() {
      loading = true;
      error = null;
      if (reset) offset = 0;
    });

    try {
      final query = Uri(
        queryParameters: {
          'limit': '$pageSize',
          'offset': '$offset',
          'sort': 'newest',
          'country_code': 'BI',
          if (controller.text.trim().isNotEmpty) 'q': controller.text.trim(),
        },
      ).query;
      final data =
          await AppScope.of(context).api.get('/listings?$query')
              as Map<String, dynamic>;
      final next = (data['items'] as List)
          .map((item) => Listing.fromJson(item as Map<String, dynamic>))
          .toList();
      if (!mounted) {
        return;
      }
      setState(() {
        listings = reset ? next : [...listings, ...next];
        hasMore = data['has_more'] as bool? ?? false;
      });
    } catch (cause) {
      if (mounted) {
        setState(() => error = cause.toString());
      }
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recherche')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => search(reset: true),
              decoration: InputDecoration(
                hintText: 'Que cherchez-vous ?',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.tune),
                  onPressed: () {},
                ),
              ),
            ),
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(error!, style: const TextStyle(color: Colors.red)),
            ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: .72,
              ),
              itemCount: listings.length + (hasMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == listings.length) {
                  return Center(
                    child: FilledButton.tonal(
                      onPressed: loading
                          ? null
                          : () {
                              offset += pageSize;
                              search(reset: false);
                            },
                      child: loading
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Next'),
                    ),
                  );
                }
                return ListingCard(listing: listings[index]);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class ListingCard extends StatelessWidget {
  const ListingCard({super.key, required this.listing});
  final Listing listing;

  @override
  Widget build(BuildContext context) {
    final image = listing.primaryImage;
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ListingDetailPage(listingId: listing.id),
        ),
      ),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: image == null
                  ? Container(
                      color: const Color(0xffe5e7eb),
                      child: const Center(child: Icon(Icons.image_outlined)),
                    )
                  : CachedNetworkImage(
                      imageUrl: image.thumbnailUrl ?? image.url,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      placeholder: (_, __) =>
                          Container(color: const Color(0xffe5e7eb)),
                      errorWidget: (_, __, ___) => Container(
                        color: const Color(0xffe5e7eb),
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    money(listing.price, listing.currency),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ListingDetailPage extends StatefulWidget {
  const ListingDetailPage({super.key, required this.listingId});
  final String listingId;

  @override
  State<ListingDetailPage> createState() => _ListingDetailPageState();
}

class _ListingDetailPageState extends State<ListingDetailPage> {
  late Future<Listing> future;

  @override
  void initState() {
    super.initState();
    future = load();
  }

  Future<Listing> load() async {
    final data = await AppScope.of(
      context,
    ).api.get('/listings/${widget.listingId}');
    return Listing.fromJson(data as Map<String, dynamic>);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Listing>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
              message: snapshot.error.toString(),
              onRetry: () => setState(() => future = load()),
            );
          }
          final listing = snapshot.data!;
          final image = listing.primaryImage;
          return CustomScrollView(
            slivers: [
              SliverAppBar.large(
                pinned: true,
                title: Text(
                  listing.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                expandedHeight: 320,
                flexibleSpace: FlexibleSpaceBar(
                  background: image == null
                      ? Container(color: const Color(0xffe5e7eb))
                      : CachedNetworkImage(
                          imageUrl: image.url,
                          fit: BoxFit.cover,
                        ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        listing.title,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        money(listing.price, listing.currency),
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 18),
                      Wrap(
                        spacing: 8,
                        children: [
                          Chip(
                            label: Text(
                              listing.condition ?? 'Etat non précisé',
                            ),
                          ),
                          Chip(label: Text(listing.countryCode)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.chat_bubble_outline),
                        label: const Text('Contacter le vendeur'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class PublishPage extends StatefulWidget {
  const PublishPage({super.key});

  @override
  State<PublishPage> createState() => _PublishPageState();
}

class _PublishPageState extends State<PublishPage> {
  bool _loadedOnce = false;
  final title = TextEditingController();
  final description = TextEditingController();
  final price = TextEditingController();
  List<Category> categories = [];
  String? categoryId;
  bool loading = true;
  bool saving = false;
  String? message;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loadedOnce) {
      return;
    }
    _loadedOnce = true;
    unawaited(loadCategories());
  }

  Future<void> loadCategories() async {
    try {
      final data = await AppScope.of(context).api.get('/categories') as List;
      if (!mounted) {
        return;
      }
      setState(() {
        categories = data
            .map((item) => Category.fromJson(item as Map<String, dynamic>))
            .where((c) => c.active)
            .toList();
        categoryId = categories.isEmpty ? null : categories.first.id;
      });
    } catch (cause) {
      if (mounted) {
        setState(() => message = cause.toString());
      }
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  Future<void> save() async {
    final session = AppScope.of(context);
    if (!session.isLoggedIn) {
      setState(() => message = 'Connectez-vous pour publier une annonce.');
      return;
    }
    if (categoryId == null || title.text.trim().isEmpty) return;
    setState(() {
      saving = true;
      message = null;
    });
    try {
      await session.api.post('/listings', {
        'category_id': categoryId,
        'country_code': session.user?.countryCode ?? 'BI',
        'title': title.text.trim(),
        'description': description.text.trim().isEmpty
            ? null
            : description.text.trim(),
        'price': price.text.trim().isEmpty
            ? null
            : num.tryParse(price.text.trim()),
        'currency': 'BIF',
        'price_type': 'NEGOTIABLE',
        'condition': 'USED',
        'allow_offers': true,
      });
      title.clear();
      description.clear();
      price.clear();
      setState(
        () => message =
            'Brouillon enregistré. Ajout de photos bientôt disponible.',
      );
    } catch (cause) {
      setState(() => message = cause.toString());
    } finally {
      setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vendre')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Nouvelle annonce',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: categoryId,
                  items: categories
                      .map(
                        (c) =>
                            DropdownMenuItem(value: c.id, child: Text(c.name)),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => categoryId = value),
                  decoration: const InputDecoration(labelText: 'Catégorie'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: title,
                  decoration: const InputDecoration(labelText: 'Titre'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: price,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Prix en BIF'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: description,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: saving ? null : save,
                  icon: saving
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save_outlined),
                  label: const Text('Enregistrer le brouillon'),
                ),
                if (message != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(message!),
                  ),
              ],
            ),
    );
  }
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final phone = TextEditingController(text: '+257');
  final password = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> login() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await AppScope.of(context).login(phone.text.trim(), password.text);
    } catch (cause) {
      setState(() => error = cause.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = AppScope.of(context);
    final user = session.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Compte')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (user != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      child: Text(
                        user.phone
                            .replaceAll('+257', '')
                            .characters
                            .take(2)
                            .toString(),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        user.phone,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.tonalIcon(
              onPressed: session.logout,
              icon: const Icon(Icons.logout),
              label: const Text('Déconnexion'),
            ),
          ] else ...[
            Text(
              'Connexion vendeur',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Téléphone'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Mot de passe'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: loading ? null : login,
              child: Text(loading ? 'Connexion...' : 'Se connecter'),
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(error!, style: const TextStyle(color: Colors.red)),
              ),
          ],
        ],
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 48),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: onRetry,
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}
